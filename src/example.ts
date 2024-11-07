type User = {
    name: string;
    age: number;
  };
  
  function isAdult(user: User): boolean {
    return user.age >= 18;
  }
  
  const justine = {
    name: 'Justine',
    age: 23,
  } satisfies User;
  
  const isJustineAnAdult = isAdult(justine);  